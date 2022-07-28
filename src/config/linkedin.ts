import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `https://www.linkedin.com/oauth/v2/authorization`,
    appId: `77g4yxut7um599`,
    icon: `fab fa-linkedin fa-2x`,
    type: `linkedin`,
    redirectUri: `${serverConfig.serverURL}/grs/linkedin/register`,
    scope: `r_liteprofile%20r_emailaddress%20w_member_social%20rw_organization_admin%20w_organization_social%20r_organization_social%20w_member_social%20r_basicprofile%20rw_ads`
}

export default parameters;