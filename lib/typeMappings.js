/**
 * Elastic search mapping for different document types,
 * converting stack exchange fields to elasticsearch mappings.
 * @module typeMappings
 *
 * @see For definition of elasticsearch mapping format:
 * {@link https://www.elastic.co/guide/en/elasticsearch/reference/6.0/mapping.html}
 *
 * @see For definition of stack exchange offline file formats: 
 * {@link https://meta.stackexchange.com/questions/2677/database-schema-documentation-for-the-public-data-dump-and-sede}
 */

/**
 * The typeMappings object has as keys an ElasticType string, each item in the appropriate format to
 * be an elasticsearch mapping definition, that is a 'property' object followed by a list of fields and types.
 * @property typeMappings{Object<ElasticType, Object>} - with all property keys as {ElasticType} strings.
 * @property typeMappings[ElasticType].properties{Object} - a list of types to index, {[key]: {type: [type]}}
 */

module.exports = {
  sepost: {
    properties: {
      Id: {type: 'integer'},
      PostTypeId: {type: 'integer'},
      AcceptedAnswerId: {type: 'integer'},
      ParentId: {type: 'integer'},
      Score: {type: 'integer'},
      ViewCount: {type: 'integer'},
      OwnerUserId: {type: 'integer'},
      //LastEditorUserId: {type: 'integer'},
      AnswerCount: {type: 'integer'},
      CommentCount: {type: 'integer'},
      FavoriteCount: {type: 'integer'},
      Body: {type: 'text'},
      Title: {type: 'text'},
      QuestionTitle: {type: 'text'},
      OwnerDisplayName: {type: 'keyword'},
      CreationDate: {type: 'date'},
      //DeletionDate: {type: 'date'},
      //LastEditDate: {type: 'date'},
      //LastActivityDate: {type: 'date'},
      //ClosedDate: {type: 'date'},
      //CommunityOwnedDate: {type: 'date'},
      Tags: {type: 'text'},
      VoteCount: {type: 'integer'},
    },
  },
  secomment: {
    properties: {
      Id: {type: 'integer'},
      PostId: {type: 'integer'},
      //Score: {type: 'integer'},
      UserId: {type: 'integer'},
      Text: {type: 'text'},
      UserDisplayName: {type: 'keyword'},
      CreationDate: {type: 'date'},
    },
  },
  seuser: {
    properties: {
      Id: {type: 'integer'},
      //Reputation: {type: 'integer'},
      //CreationDate: {type: 'date'},
      //LastAccessDate: {type: 'date'},
      DisplayName: {type: 'keyword'},
      //WebsiteUrl: {type: 'keyword'},
      //Location: {type: 'keyword'},
      //ProfileImageUrl: {type: 'keyword'},
      //EmailHash: {type: 'keyword'},
      //Views: {type: 'integer'},
      //UpVotes: {type: 'integer'},
      //DownVotes: {type: 'integer'},
      AccountId: {type: 'integer'},
      //Age: {type: 'integer'},
      //AboutMe: {type: 'text'},
    },
  },
  sepostlink: {
    properties: {
      Id: {type: 'integer'},
      //CreationDate: {type: 'date'},
      PostId: {type: 'integer'},
      RelatedPostId: {type: 'integer'},
      LinkTypeId: {type: 'integer'},
    },
  },
};
