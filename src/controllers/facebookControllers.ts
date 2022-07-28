/* eslint-disable no-restricted-syntax */
import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import axios from 'axios'
import moment from 'moment'
import { decodeState, getAccountAccess, Uploader, IPostData, CreateFacebookPost } from '../factory/factory'
import { VideoUploader } from '../factory/videoFactory'
import Configuration from '../config/config'
import Client from '../entity/Clients'
import Account from '../entity/Accounts'
import Waitingposts from '../entity/WaitingPosts'

const { serverConfig } = Configuration

export default class FacebookControllers {
    public Login = async (req: Request, res: Response) => {
        try {
            // console.log(req.query)
            const Accounts = new Account()
            const response = await axios.get(`https://graph.facebook.com/v13.0/oauth/access_token?client_id=1327675651082556&redirect_uri=${serverConfig.serverURL}/grs/facebook/register&client_secret=26ba50a794441bba7ba51518a07d0dbb&code=${req.query.code}`)
            let data = {...response.data, ...req.query}
            const result = (await axios.get(`https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=1327675651082556&client_secret=26ba50a794441bba7ba51518a07d0dbb&fb_exchange_token=${data.access_token}`))
            data = { ...data, ...result.data }
            const state = decodeState(data.state)
            const user = (await axios.get(`https://graph.facebook.com/me?access_token=${data.access_token}`)).data
            // console.log('myaccountid: ',user.id)
            const Clients = await getRepository(Client).findOne({ id: state.id })
            const existingAccount = await getRepository(Account).findOne({ accountId: user.id })
            
            if (existingAccount) {
                existingAccount.expireIn = data.expires_in
                existingAccount.refreshToken = data.id_token
                existingAccount.token = data.access_token

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && data.id_token && data.access_token && user.id && user.name) {
                Accounts.client = Clients
                Accounts.expireIn = data.expires_in 
                Accounts.refreshToken = data.id_token
                Accounts.type = "facebook"
                Accounts.accountId = user.id
                Accounts.accountName = user.name
                Accounts.token = data.access_token

                await getRepository(Account).save(Accounts)
            }

            return res.redirect(state.url)
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getMyPages = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            // console.log(id)
            if (!id) return res.status(400).json({ success: false })

            const Compte = await getRepository(Account).findOne({ id: parseInt(id, 10) })
            if (!Compte)
                return res.status(500).json({ success: false, message: 'Not Found' })

            if (Compte.type !== 'facebook') 
                return res.status(401).json({ sucess: false, message: 'Not a facebook account!' })

            const response = (await axios.get(`https://graph.facebook.com/v13.0/me/accounts?fields=name,access_token&access_token=${Compte.token}`)).data

            if (Array.isArray(response.data)) {
                const instaPages = []
                for (const page of response.data) {
                    const result = (await axios.get(`https://graph.facebook.com/v13.0/${page.id}?fields=instagram_business_account&access_token=${Compte.token}`)).data
                    console.log(result)
                    if (result.instagram_business_account) {
                        instaPages.push({
                            id: result.instagram_business_account.id,
                            name: `${page.name}-Insta`,
                            type: 'instagram',
                            accountType: 'page',
                            managerAccountId: id
                        })
                    }
                }
                const pages = response.data.map((el: any) => ({
                    id: el.id,
                    name: el.name,
                    type: 'facebook',
                    accountType: 'page',
                    managerAccountId: id
                }))

                const accounts = [...pages, ...instaPages, {
                    id: Compte.id,
                    name: Compte.accountName,
                    type: 'facebook',
                    accountType: 'personnal'
                }]

                return res.status(200).json({ success: true, data: accounts })
            }

            return res.status(200).json({ success: true, data: [{
                id: Compte.accountId,
                name: Compte.accountName,
                type: 'personnal'
            }] })
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    }

    /**
     * 
     * @param access
     * id: idCompte (page or account)
     * type: 'facebook' 'google' etc
     * accountType: 'page' 'personnal'
     * managerAccountId: id of page manager and id accountType is personnal, this will be undefined
     */

    public getPageStats = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            // const Compte = await getRepository(Account).findOne({  })
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v13.0/${state.id}/insights?access_token=${accountAccess.access_token}&metric=page_post_engagements,page_engaged_users,page_total_actions,page_views_total,page_fan_adds,post_impressions,post_engaged_users,page_fans&locale=fr_FR`)).data
            // console.log(response)

            return res.status(200).json({ success: true, data: response.data })
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    }

    public getPagePostCount = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v13.0/${accountAccess.accountId}/feed?fields=id&access_token=${accountAccess.access_token}`)).data
            if (!response.data) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: response.data.length })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getPagePosts = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v13.0/${accountAccess.accountId}/feed?fields=id,created_time,message,story,full_picture&access_token=${accountAccess.access_token}`)).data
            if (!response.data) return res.status(500).json({ success: false })

            const posts = [...response.data]

            const scopes = (await axios.get(`https://graph.facebook.com/v13.0/${state.id}/insights?access_token=${accountAccess.access_token}&metric=page_posts_impressions_unique&period=day`)).data
            const scopesValue = scopes.data[0].values[1].value


            const postStatistique  = await Promise.all(posts.map(async (el: any) => {
                const result = (await axios.get(`https://graph.facebook.com/${el.id}/insights?metric=post_reactions_like_total,post_reactions_love_total,post_reactions_wow_total&access_token=${accountAccess.access_token}`)).data
                let sum = 0
                for(const stats of result.data) 
                    sum += stats.values[0].value

                const comments = (await axios.get(`https://graph.facebook.com/v13.0/${el.id}/comments?access_token=${accountAccess.access_token}`)).data
                if (Array.isArray(comments.data)) sum += comments.data.length

                return {
                    ...el,
                    porte: scopesValue,
                    reaction: sum
                }
            }))

            return res.status(200).json({ success: true, data: postStatistique})
        }
        catch (error) {
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        }
    }

    /** gestion de publication de contenue */

    public createPost = async (req: Request, res: Response) => {
        try {
            // accès
            const data = {} as IPostData 
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            // gestion de upload
            const { type } = req.body
            
            if (type === 'photo') {
                const uploadedFiles = await Uploader(req)
                if (!uploadedFiles) return res.status(500).json({ success: false, message: 'upload file error' })
                data.files = uploadedFiles
            }

            if (type === 'video') {
                const uploadedFile = await VideoUploader(req)
                if (!uploadedFile) return res.status(500).json({ success: false, message: 'upload file error' })
                data.files = uploadedFile.partList
                data.fileSize = uploadedFile.size
            }

            // formatting data
            data.text = req.body.text
            data.access = accountAccess.access_token
            if (type === 'link') data.link = req.body.link

            // manage publish
            const response = await CreateFacebookPost(state.id, type, state.accountType, data)

            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    } 

    public createSchedulePost = async (req: Request, res: Response) => {
        try {
            // accès
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
            if (type === 'link') data.link = req.body.link

            // manage publish
            // date de publication
            const publishDate = moment(req.body.publishDate).unix()
            const response = await CreateFacebookPost(state.id, type, state.accountType, data, publishDate, false)

            if (!response) return res.status(500).json({ success: false })

            // save publication
            // 1 - get the account
            const account = await getRepository(Account).findOne({ id: state.id })
            if (!account) return res.status(404).json({ success: false })

            const posts = new Waitingposts()
            posts.account = account
            posts.accountType = state.accountType
            posts.description = data.text
            posts.publishDate = new Date(req.body.publishDate)
            posts.pageId = state.id
            posts.type = type
            posts.postId = response.id

            await getRepository(Waitingposts).save(posts)

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /** gestion de publication plannifier */

    public getPost = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { id } = req.query
            if (!access || !id) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const response = (await axios.get(`https://graph.facebook.com/v13.0/${id}?access_token=${accountAccess.access_token}&fields=id,actions,call_to_action,created_time,full_picture,message,shares,story`)).data

            // const sharedposts = (await axios.get(`https://graph.facebook.com/v13.0/${id}/sharedposts?access_token=${accountAccess.access_token}`)).data
            // console.log(sharedposts)

            return res.status(200).json({ success: true, data: response })

        }
        catch (error){
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        } 
    }

    public getPostComments = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { id } = req.query
            if (!access || !id) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const comments = (await axios.get(`https://graph.facebook.com/v13.0/${id}/comments?access_token=${accountAccess.access_token}`)).data
            
            return res.status(200).json({ success: true, data: comments.data })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getPostReactions = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { id } = req.query
            if (!access || !id) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const reactions = (await axios.get(`https://graph.facebook.com/v13.0/${id}/likes?access_token=${accountAccess.access_token}`)).data
            

            return res.status(200).json({ success: true, data: reactions.data })

        }
        catch (error){
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        } 
    }

    public getPostShares = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { id } = req.query
            if (!access || !id) return res.status(400).json({ success: false })

            const state = decodeState(access)
            if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const sharedposts = (await axios.get(`https://graph.facebook.com/v13.0/${id}/sharedposts?access_token=${accountAccess.access_token}`)).data
            console.log(sharedposts)

            return res.status(200).json({ success: true, data: sharedposts.data })
        }
        catch (error){
            console.log(error.response.data)

            return res.status(500).json({ success: false })
        } 
    }
}