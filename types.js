/**
 * Contains JSDOC typedefs for use in other files
 */

/**
  * The client object used in elasticSearch. This is the return from the elasticsearch js interface
  * 'new elasticsearch.Client(...)' This value is passed around mainly to keep test values separate
  * from production values.
  * @typedef ElasticClient
  * @type {Object}
  */

/**
 * An elasticSearch type, a string with defined mapping in elasticClient.js
 * These values by local convention have the form 'se' + the related xml file name, for
 * example 'sepost'.
 * @typedef ElasticType
 * @type {string} 
 */

/**
  * An elasticSearch index, a string referencing the name of a particular elasticSearch index.
  * By local convention, there is one elasticsearch type per index, and the index
  * name is composed of a prefix followed by the ElasticType type kept in the index.
  * The prefix may be set arbitrarily by the person managing the indexing, but typically should
  * convey some general idea of the unifying idea behind an indexing run.
  * @example elasticIndexPrefix = 'javascript_'
  * @example  elasticIndexName = 'javascript_sepost'
  * @typedef ElasticIndex
  * @type {string}
  */

/**
 * The response from an elasticSearch request, an object with API-specific meanings.
 * @typedef ElasticResponse
 * @type {Object}
 */
