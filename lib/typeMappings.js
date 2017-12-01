/**
 * Elastic search mapping for different document types.
 * {ElasticType> key prefixes:
 *   se: Stack Exchange (like Stack Overflow)
 * @type {Object}
 * @property name{string} - filename used for this type
 * @property properties{Object} with all property keys as {ElasticType} strings.
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
      //LastEditorUserId: {type: 'integer'},
      AnswerCount: {type: 'integer'},
      CommentCount: {type: 'integer'},
      FavoriteCount: {type: 'integer'},
      Body: {type: 'text', analyzer: 'std_english'},
      Title: {type: 'text', analyzer: 'std_english'},
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
      Text: {type: 'text', analyzer: 'std_english'},
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
      //AboutMe: {type: 'text', analyzer: 'std_english'},
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

module.exports = typeMappings;
