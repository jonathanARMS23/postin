import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `https://api.instagram.com/oauth/authorize`,
    appId: 316218277067169,
    icon: `fab fa-instagram fa-2x`,
    type: `instagram`,
    redirectUri: `${serverConfig.serverURL}/grs/instagram/register`,
    scope: `user_profile,user_media,ads_management,business_management,instagram_basic,instagram_content_publish,pages_read_engagement`
}

export default parameters