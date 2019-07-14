const queryUserInfo = `query queryRepoInfo($login: String!) {
	user(login: $login) {
    login,
    name,
    bio,
    avatarUrl,
    websiteUrl,
    followers {
      totalCount
    }
  }
}`;

function extractUserInfo(response) {
  const {
    user: {
      login,
      name,
      bio,
      avatarUrl,
      websiteUrl,
      followers: { totalCount: followers }
    }
  } = response;
  return {
    login,
    name,
    bio,
    followers,
    avatar_url: avatarUrl,
    blog: websiteUrl
  };
}

module.exports = {
  queryUserInfo,
  extractUserInfo
};
