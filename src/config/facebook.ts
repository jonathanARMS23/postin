import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `https://www.facebook.com/v13.0/dialog/oauth`,
    appId: 1327675651082556,
    graph: `https://graph.facebook.com/`,
    graphVideo: `https://graph.facebook.com/`,
    icon: `fab fa-facebook fa-2x`,
    type: `facebook`,
    redirectUri: `${serverConfig.serverURL}/grs/facebook/register`,
    scope: `openid,email,user_posts,pages_show_list,pages_manage_posts,pages_read_user_content,pages_read_engagement,ads_management,business_management,publish_video,user_posts,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_insights,read_insights`
}

export default parameters