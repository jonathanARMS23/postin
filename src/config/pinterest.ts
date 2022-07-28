import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `https://www.pinterest.com/oauth/`,
    appId: 1476576,
    graph: `https://graph.facebook.com/`,
    icon: `fab fa-pinterest fa-2x`,
    type: `pinterest`,
    redirectUri: `${serverConfig.serverURL}/grs/pinterest/register`,
    scope: `ads:read,boards:read,boards:write,pins:read,pins:write,user_accounts:read`
}

export default parameters