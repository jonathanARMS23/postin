import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `https://accounts.google.com/o/oauth2/v2/auth`,
    appId: `555518876165-arqkg25crg1au1bl8io7psm6p9i8me5g.apps.googleusercontent.com`,
    icon: `fab fa-youtube fa-2x`,
    type: `youtube`,
    redirectUri: `${serverConfig.serverURL}/grs/google/youtube/register`,
    scope: `openid%20https://www.googleapis.com/auth/userinfo.profile%20https://www.googleapis.com/auth/youtube%20https://www.googleapis.com/auth/youtube.channel-memberships.creator%20https://www.googleapis.com/auth/youtube.force-ssl%20https://www.googleapis.com/auth/youtube.readonly%20https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtubepartner%20https://www.googleapis.com/auth/youtubepartner-channel-audit`
}

export default parameters;