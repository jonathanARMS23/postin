import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import axios from 'axios';
import moment from 'moment';
import * as qs from 'query-string'
import { decodeState, getAccountAccess, IPostData, Uploader, CreateInstagramPost } from '../factory/factory'
import Configuration from '../config/config'
import InstaConfig from '../config/facebook'
import Account from '../entity/Accounts'
import Client from '../entity/Clients'

const { serverConfig } = Configuration

export default class InstagramControllers {
    public Login = async (req: Request, res: Response) => {
        try {
            const Accounts = new Account()
            const postBody = {
                client_id: 316218277067169,
                client_secret: `bcf7470c8decd8f2047e4a2e3cc6a9e2`,
                code: `${req.query.code}`,
                grant_type: `authorization_code`,
                redirect_uri: `${serverConfig.serverURL}/grs/instagram/register`,
            }
            const response = await axios.post(`https://api.instagram.com/oauth/access_token`, qs.stringify(postBody), {
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                }
            })
            let data = { ...response.data, ...req.query }
            const state = decodeState(data.state)
            const getAccess = await axios.get(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_id=316218277067169&client_secret=bcf7470c8decd8f2047e4a2e3cc6a9e2&access_token=${data.access_token}`)
            data = {...data, ...getAccess.data}
            const user = (await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${data.access_token}`)).data
            const Clients = await getRepository(Client).findOne({ id: state.id })
            const existingAccount = await getRepository(Account).findOne({ accountId: user.id })
            
            if (existingAccount) {
                existingAccount.expireIn = data.expires_in
                existingAccount.token = data.access_token

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && data.access_token && user.id && user.username) {
                Accounts.client = Clients
                Accounts.expireIn = data.expires_in
                Accounts.refreshToken = ""
                Accounts.type = "instagram"
                Accounts.accountId = user.id
                Accounts.accountName = user.username
                Accounts.token = data.access_token

                await getRepository(Account).save(Accounts)
            }

            return res.redirect(state.url)
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    }

    /** public getPageStats = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            // const Compte = await getRepository(Account).findOne({  })
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})
            console.log(state)
            const response = (await axios.get(`https://graph.facebook.com/${state.id}/insights?metric=impressions,reach,profile_views,follower_count,email_contacts&period=day&access_token=${accountAccess.access_token}`)).data
            console.log(response)

            return res.status(200).json({ success: true})
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    } */ 

        // insta-id: 17841452632551262
    public getAccountInfo = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v3.2/${state.id}?fields=username,media,followers_count,media_count&access_token=${accountAccess.access_token}`)).data
            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /** creation de post */

    public createPost = async (req: Request, res: Response) => {
        try {
            // gestion des accès
            const data = {} as IPostData
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            // gestion de upload
            const { type } = req.body
            
            if (type === 'photo' || type === 'video') {
                const uploadedFiles = await Uploader(req)
                if (!uploadedFiles) return res.status(500).json({ success: false, message: 'upload file error' })
                data.files = uploadedFiles
            }

            // formatting data
            data.text = req.body.text
            data.access = accountAccess.access_token

            // manage publish
            const response = await CreateInstagramPost(state.id, state.accountType, data)

            if (!response) return res.status(500).json({ success: false })

            return res.status(500).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /** plannification de publication */

    public createScheduledPost = async (req: Request, res: Response) => {
        try {
            // gestion des accès
            const data = {} as IPostData
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            // gestion de upload
            const { type } = req.body
            
            if (type === 'photo' || type === 'video') {
                const uploadedFiles = await Uploader(req)
                if (!uploadedFiles) return res.status(500).json({ success: false, message: 'upload file error' })
                data.files = uploadedFiles
            }

            // formatting data
            data.text = req.body.text
            data.access = accountAccess.access_token

            // manage publish
            const publishDate = moment(req.body.publishDate).unix()
            const response = await CreateInstagramPost(state.id, state.accountType, data, publishDate, false)

            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllPost = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v3.2/${state.id}/media?fields=id,media_type,media_url,username,timestamp&access_token=${accountAccess.access_token}`)).data
            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllPostWithStats = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v3.2/${state.id}/media?fields=id,permalink,comments_count,like_count,caption,media_type,media_url,username,timestamp&access_token=${accountAccess.access_token}`)).data
            if (!response) return res.status(500).json({ success: false })

            const pubs = response.data as Array<any>

            const pubStats = await Promise.all(pubs.map(async (el: any) => {
                const result = (await axios.get(`https://graph.facebook.com/${el.id}/insights?metric=engagement,impressions,reach&access_token=${accountAccess.access_token}`)).data
                return {
                    ...el,
                    stats: result.data,
                    token: accountAccess.access_token,
                    appId: InstaConfig.appId
                } 
            }))

            console.log(pubStats)

            return res.status(200).json({ success: true, data: pubStats })
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    }

    public getPostStats = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { id } = req.query

            if (!id) return res.status(400).json({ success: false })
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v3.2/${id}?fields=id,permalink,comments_count,like_count,caption,media_type,media_url,username,timestamp&access_token=${accountAccess.access_token}`)).data
            if (!response) return res.status(500).json({ success: false })

            const result = (await axios.get(`https://graph.facebook.com/${id}/insights?metric=engagement,impressions,reach&access_token=${accountAccess.access_token}`)).data
            if (!result) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: {
                ...response,
                stats: result.data,
                token: accountAccess.access_token
            } })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAccountStats = async (req: Request, res: Response) => {
        try {
            const { access } = req.params

            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            /** const response = (await axios.get(`https://graph.facebook.com/v3.2/${state.id}?fields=username,media,followers_count,media_count&access_token=${accountAccess.access_token}`)).data
            if (!response) return res.status(500).json({ success: false }) */

            const result = (await axios.get(`https://graph.facebook.com/${state.id}/insights?metric=impressions,reach,profile_views,follower_count&period=day&access_token=${accountAccess.access_token}`)).data
            if (!result) return res.status(500).json({ success: false })
            console.log(result)
            /** const stats = [
                ...result.data,
                {
                    name: "followers",
                    period: "day",
                    values: [
                      {
                        value: response.followers_count,
                        end_time: moment().toISOString()
                      },
                      {
                        value: response.followers_count,
                        end_time: moment().toISOString()
                      }
                    ],
                    title: "Abonnées",
                    description: "Total number of followers",
                    id: "instagram_business_account_id/insights/followers/day"
                }
            ] */

            return res.status(200).json({ success: true, data: result.data })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }
}