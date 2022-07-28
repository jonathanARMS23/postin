import Configuration from '../config/config'

const { serverConfig } = Configuration

const parameters = {
    loginURL: `${serverConfig.serverURL}/grs/twitter/request_token`,
    appId: `FbxxSRBAMdHz2omrK997A3J3s`,
    icon: `fab fa-twitter fa-2x`,
    type: `twitter`,
    redirectUri: `${serverConfig.serverURL}/grs/twitter/register`,
    scope: `r_liteprofile%20r_emailaddress%20w_member_social`
}

export const secretParameters = {
    app_key: 'FbxxSRBAMdHz2omrK997A3J3s',
    app_secret: 'bogcREwwz5lBrHFUh1ow8yiblwPZQTHoc52UGOjGnecfn9XSem',
    signatureMethod: 'HMAC-SHA1',
    bearerToken: 'AAAAAAAAAAAAAAAAAAAAALnEaAEAAAAAwMn1iDHvYLXG%2Fu9H84yd0NJfCj8%3D0is60KAHZixljgaGyPGABesPDo2XHcgvq99ru98znynPS8x55l',
    accessToken: '1070209015098032128-AVQBqUuaRNiAN27iPh6Ghb4Z5QjRqN',
    tokenSecret: 'M6EbeYWa2XhvJa95JIIImqnu5sXO293OjaPjHnvJVkvmM',
}

export interface IPostData {
    text: string
    link?: string
    for_super_followers_only?: boolean
}

export default parameters;