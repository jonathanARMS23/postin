/* eslint-disable no-restricted-syntax */
import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import moment from 'moment'
import axios from 'axios'
import qs from 'query-string'
import Configurations from '../config/config'
import { decodeState, getAccountAccess, Uploader, refreshPinterestToken } from '../factory/factory'
import Client from '../entity/Clients'
import Account from '../entity/Accounts'
import Postfiles from '../entity/PostFiles'
import Waitingposts from '../entity/WaitingPosts'


export default class PinterestControllers {
    public Login = async (req: Request, res: Response) => {
        try {
            const Accounts = new Account()
            /** construction du body */
            const bodyPost = {
                code: req.query.code,
                redirect_uri: `${Configurations.serverConfig.serverURL}/grs/pinterest/register`,
                grant_type: 'authorization_code'
            }
            /** générate authorization base64 */
            const auth = btoa('1476576:f476b0b636ae6204ecbceb88c6b99431a179d7f7')

            const response = await axios.post(`https://api.pinterest.com/v5/oauth/token`, qs.stringify(bodyPost), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                }
            })
            const data = {...response.data, ...req.query}
            const user = (await axios.get('https://api.pinterest.com/v5/user_account', {
                headers: {
                    'Authorization': `Bearer ${data.access_token}`
                }
            })).data
            const state = decodeState(data.state)

            const Clients = await getRepository(Client).findOne({ id: state.id })
            const existingAccount = await getRepository(Account).findOne({ accountId: user.username })
            
            if (existingAccount) {
                existingAccount.expireIn = moment().add(data.expires_in, 'seconds').unix()
                existingAccount.refreshToken = data.id_token
                existingAccount.token = data.access_token

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && data.refresh_token && data.access_token && user.username) {
                Accounts.client = Clients
                Accounts.expireIn = moment().add(data.expires_in, 'seconds').unix()
                Accounts.refreshToken = data.refresh_token
                Accounts.type = "pinterest"
                Accounts.accountId = user.username
                Accounts.accountName = user.username
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

    /**
     * creation board
     */

    public createBoard = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            /** body */
            const bodyRequest = {
                name: req.body.name,
                description: req.body.description,
                privacy: req.body.privacy, // PUBLIC / PROTECTED / SECRET
            }

            const response = (await axios.post(`https://api.pinterest.com/v5/boards`, bodyRequest, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'content-type': 'application/json',
                    Accept: 'application/json'
                }
            })).data

            if (!response) return res.status(400).json({ success: false })

            return res.status(200).json({success: true})
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /** 
     * get list of board
    */

    public getAllBoards = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const privacy = req.query.privacy ?? 'PUBLIC'
            const page_size = req.query.page_size ?? 10
            // const bookmark = req.query.bookmark ?? ''

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const response = (await axios.get(`https://api.pinterest.com/v5/boards?page_size=${page_size}&privacy=${privacy}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data 
            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /**
     * create section board
     */

    public createSectionBoard = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { board_id } = req.body

            console.log(req.body, req.params)

            if (!board_id) return res.status(400).json({ success: false })

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const bodyRequest = {
                name: req.body.name,
            }

            console.log(req.body, req.params)

            const response = (await axios.post(`https://api.pinterest.com/v5/boards/${board_id}/sections`, bodyRequest, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'content-type': 'application/json',
                    Accept: 'application/json'
                }
            })).data

            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /**
     * get board section list
     */

    public getAllBoardSection = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { board_id } = req.query
            // const bookmark = req.query.bookmark ?? ''
            const page_size = req.query.page_size ?? 10

            if (!board_id) return res.status(400).json({ success: false })

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const response = (await axios.get(`https://api.pinterest.com/v5/boards/${board_id}/sections?page_size=${page_size}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data
            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    /**
     * create pins
     */

    public createPins = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const uploadedFiles = await Uploader(req)
            // console.log(uploadedFiles)
            if (!uploadedFiles) return res.status(400).json({ success: false })

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            for (const file of uploadedFiles) {
                const bodyRequest = {
                    link: req.body.link,
                    title: req.body.title,
                    description: req.body.description,
                    alt_text: req.body.text,
                    board_id: req.body.board_id,
                    board_section_id: req.body.section,
                    media_source: {
                        source_type: 'image_url',
                        url: file.path
                    }
                }
                const response = (await axios.post(`https://api.pinterest.com/v5/pins`, bodyRequest,{
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'content-type': 'application/json',
                        Accept: 'application/json'
                    }
                })).data

                if (!response) return res.status(500).json({ success: false })
            }

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    // create waiting post

    public createScheduledPost = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            /** save in waiting post */
            // get the account
            const account = await getRepository(Account).findOne({ id: state.id })
            if (!account) return res.status(500).json({ success: false })
            

            // save upload files 
            const uploadedFiles = await Uploader(req)
            if (!uploadedFiles) return res.status(500).json({ success: false})

            // save the waiting post
            const poste = new Waitingposts()
            poste.account = account
            poste.accountType = 'page'
            poste.link = req.body.link
            poste.pageId = state.id
            poste.publishDate = new Date(req.body.publishDate)
            poste.description = req.body.description
            poste.title = req.body.title
            poste.type = 'photo'
            
            await getRepository(Waitingposts).save(poste)

            // save information in filePost
            const posteFiles: Array<Postfiles> = []
            for (const file of uploadedFiles) {
                const posteFile = new Postfiles()
                posteFile.extension = file.extension
                posteFile.filename = file.name
                posteFile.path = file.path
                posteFile.type = file.type
                posteFile.post = poste

                await getRepository(Postfiles).save(posteFile)

                posteFiles.push(posteFile)
            }

            // update waitingpost
            poste.files = posteFiles

            await getRepository(Waitingposts).save(poste)

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllPins = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { board_id } = req.query
            const today = moment().startOf('day').format('YYYY-MM-DD')
            const metrics = ["IMPRESSION", "SAVE", "PIN_CLICK", "OUTBOUND_CLICK", "VIDEO_MRC_VIEW", "VIDEO_AVG_WATCH_TIME", "VIDEO_V50_WATCH_TIME", "QUARTILE_95_PERCENT_VIEW"] 

            if (!board_id) return res.status(400).json({ success: false })
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const response = (await axios.get(`https://api.pinterest.com/v5/boards/${board_id}/pins`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data

            if (!response) return res.status(400).json({ success: false })

            /** get pins analytics */
            const { items } = response

            if (!items) return res.status(400).json({ success: false })

            const data = await Promise.all(items.map(async (el: any) => {
                const result = (await axios.get(`https://api.pinterest.com/v5/pins/${el.id}/analytics?start_date=${today}&end_date=${today}&metric_types=${metrics}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        Accept: 'application/json'
                    }
                })).data

                if (!result) return el

                return {
                    ...el,
                    ...result
                }
            }))

            return res.status(200).json({ success: true, data })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getPinInfo = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { pin_id, start_date, end_date } = req.query

            if (!pin_id || start_date || end_date) return res.status(400).json({ success: false })
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const infoRequest = (await axios.get(`https://api.pinterest.com/v5/pins/${pin_id}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data

            if (!infoRequest) return res.status(500).json({ success: false })

            const metrics = ['IMPRESSION', 'SAVE', 'PIN_CLICK', 'OUTBOUND_CLICK', 'VIDEO_MRC_VIEW', 'VIDEO_AVG_WATCH_TIME', 'VIDEO_V50_WATCH_TIME', 'QUARTILE_95_PERCENT_VIEW']
            const start = moment(start_date).format('YYYY-MM-DD')
            const end = moment(end_date).format('YYYY-MM-DD')

            const statsRequest = (await axios.get(`https://api.pinterest.com/v5/pins/${pin_id}/analytics?start_date=${start}&end_date=${end}&metric_types=${metrics.join('%2C')}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data

            if (!statsRequest) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: {
                ...infoRequest,
                ...statsRequest
            } })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getPinCount = async (req: Request, res: Response) => {
        try {
            const { access } = req.params

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)
            let count = 0

            const response = (await axios.get(`https://api.pinterest.com/v5/boards?page_size=${100}&privacy=PUBLIC`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data 
            if (!response) return res.status(500).json({ success: false })
            const boardList = response.items as Array<any>
            const boardIdList = boardList.map((el: any) => el.id)
            for (const item of boardIdList) {
                const result = (await axios.get(`https://api.pinterest.com/v5/boards/${item}/pins`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
                })).data

                if (!result) return res.status(400).json({ success: false })

                const pinsList = result.items as Array<any>
                count += pinsList.length
            }

            return res.status(200).json({ success: true, data: count })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAccountInfo = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            /** const { start_date, end_date  } = req.query

            if (!start_date || !end_date) return res.status(400).json({ success: false }) */
            const today = moment().format('YYYY-MM-DD')

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })

            const accessToken = await refreshPinterestToken(state.id)

            const info = (await axios.get(`https://api.pinterest.com/v5/user_account`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data

            if (!info) return res.status(500).json({ success: false })

            /** const start = moment(start_date as string).format('YYYY-MM-DD')
            const end = moment(end_date as string).format('YYYY-MM-DD') */

            const response = (await axios.get(`https://api.pinterest.com/v5/user_account/analytics?start_date=${today}&end_date=${today}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    Accept: 'application/json'
                }
            })).data

            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: {
                ...info,
                ...response
            } })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }
}