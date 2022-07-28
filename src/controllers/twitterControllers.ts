/* eslint-disable no-restricted-syntax */
import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import axios from 'axios'
import { TwitterApi } from 'twitter-api-v2'
import { decodeState, getAccountAccess, Uploader } from '../factory/factory'
import Configuration, { secretParameters } from '../config/twitter'
import Client from '../entity/Clients'
import Account from '../entity/Accounts'

export default class TwitterControllers {
    public Login = async (req: Request, res: Response) => {
        try {
            const Accounts = new Account()
            console.log(`parametre de la requete: ${req.query}`)
            const { oauth_token, oauth_verifier, state } = req.query
            if (!oauth_token || !oauth_verifier)
                return res.json({ success: false })

            const response = (await axios.post(`https://api.twitter.com/oauth/access_token?oauth_verifier=${oauth_verifier}&oauth_token=${oauth_token}`)).data
            
            console.log(`reponse de la demande de token: ${response}`)
            const authentification = {
                token_secret: '',
                access_token: '',
                user_id: '',
                name: '',
            }
            const dataTab = response.split('&') as Array<string>
            dataTab.forEach((el: string) => {
                const splited = el.split('=')
                switch (splited[0]) {
                    case 'oauth_token_secret':
                        authentification.token_secret = splited[1] as string
                        break
                    case 'oauth_token':
                        authentification.access_token = splited[1] as string
                        break
                    case 'user_id':
                        authentification.user_id = splited[1] as string
                        break
                    case 'screen_name':
                        authentification.name = splited[1] as string
                        break
                    default: 
                        break
                }
            })
            const decodedState = decodeState(state as string)
            const Clients = await getRepository(Client).findOne({ id: decodedState.id })
            const existingAccount = await getRepository(Account).findOne({ accountId: authentification.user_id })
            
            if (existingAccount) {
                existingAccount.expireIn = Math.floor(Date.now() / 1000)
                existingAccount.refreshToken = ''
                existingAccount.token = authentification.access_token
                existingAccount.idToken = authentification.token_secret

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && authentification.access_token && authentification.user_id && authentification.name) {
                Accounts.client = Clients
                Accounts.expireIn = Math.floor(Date.now() / 1000)
                Accounts.refreshToken = ''
                Accounts.type = "twitter"
                Accounts.accountId = authentification.user_id
                Accounts.accountName = authentification.name
                Accounts.token = authentification.access_token
                Accounts.idToken = authentification.token_secret

                await getRepository(Account).save(Accounts)
            }

            return res.redirect(decodedState.url)
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public RequestToken = async (req: Request, res: Response) => {
        try {
            const { state } = req.query
            /** generate authentification Link */
            const twitterClient = new TwitterApi({
                appKey: secretParameters.app_key,
                appSecret: secretParameters.app_secret,
            })
            const authLink = await twitterClient.generateAuthLink(`${Configuration.redirectUri}?state=${state}`);
            console.log(authLink)
            const { url } = authLink;
            return res.redirect(url)
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    // create publication
    public CreatePost = async (req: Request, res: Response) => {
        try {
            // access
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })

            const state = decodeState(access)
            console.log(state)
            /// if (!state.managerAccountId) return res.status(400).json({ success: false, message: 'no page account' })

            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false})

            const TwitterClient = new TwitterApi({
                appKey: secretParameters.app_key,
                appSecret: secretParameters.app_secret,
                accessToken: accountAccess.access_token,
                accessSecret: accountAccess.secret_token,
            })

            // upoad the file
            if (req.files) {
                const mediaIds = []
                const uploadFiles = await Uploader(req)
                if (!uploadFiles) return res.status(500)

                for (const file of uploadFiles) {
                    const response = await TwitterClient.v1.uploadMedia(file.path)
                    if (response) mediaIds.push(response)
                }
            }

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    } 
}