import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import facebookParameters from '../config/facebook'
import linkedinParameters from '../config/linkedin'
import instagramParameters from '../config/instagram'
import googleParameters from '../config/google'
import twitterParameters from '../config/twitter'
import pinterestParameters from '../config/pinterest'
import Account from '../entity/Accounts'
import Client from '../entity/Clients'
import User from '../entity/Users'
import { decodeState, getAccountAccess, SharePost } from '../factory/factory'
import { VideoUploader } from '../factory/videoFactory'
// 26ba50a794441bba7ba51518a07d0dbb

export default class grsControllers {
    // eslint-disable-next-line no-unused-vars
    public getApps = (req: Request, res: Response) => {
        try {
            const response = [
                facebookParameters,
                linkedinParameters,
                instagramParameters,
                googleParameters,
                twitterParameters,
                pinterestParameters
            ]
            res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            res.status(500).json({ success: false })
        }
    }

    public getClientAccounts = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const Accounts = getRepository(Account)
            if (id) {
                const client_id = parseInt(id, 10)
                const Clients = await getRepository(Client).findOne({ id: client_id })
                const result = await Accounts.find({ client: Clients })
                const data = result.map((el: any) => ({
                        id: el.id,
                        type: el.type,
                    }))


                return res.status(200).json({ success: true, client: {
                    id,
                    username: Clients?.username
                }, data })
            }
            return res.status(300).json({ success: false })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public deleteAccount = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            if (id) {
                const account_id = parseInt(id, 10)
                const targetAccount = await getRepository(Account).findOne({ relations: ['users'], where: { id: account_id}})
                if (!targetAccount)
                    return res.status(404).json({ success: false })

                console.log(targetAccount)

                if (targetAccount.users.length > 0) {
                    const allCommunityIds = targetAccount.users.map((el: User) => el.id)
                    const allCommunity = await getRepository(User)
                    .createQueryBuilder('users')
                    .leftJoinAndSelect('users.accounts', 'accounts')
                    .where('users.id IN (:...ids)', { ids: allCommunityIds })
                    .getMany()

                    // eslint-disable-next-line no-restricted-syntax
                    for (const el of allCommunity) {
                        const temp = el
                        const newAccounts = temp.accounts.filter((item: Account) => item.id !== account_id)
                        temp.accounts = newAccounts
                        await getRepository(User).save(temp)
                    }
                }
                await getRepository(Account).delete({ id: account_id })

                return res.status(200).json({ success: true})
            }

            return res.status(500).json({ success: false })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllAccounts = async (req: Request, res: Response) => {
        try {
            const Accounts = getRepository(Account)
            const result = await Accounts.find({ relations: ['client', 'users'] })
            const data = result.map((el: Account) => ({
                    id: el.id,
                    type: el.type,
                    client: el.client,
                    users: el.users
                }))


            return res.status(200).json({ success: true, data })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllCommunity = async (req: Request, res: Response) => {
        try {
            const { id } = req.params

            if(!id) return res.json({ success: false })

            const targetAccount = await getRepository(Account).findOne({ relations: ['users'], where: { id: parseInt(id, 10)}})
            if(!targetAccount) return res.json({ success: false })

            return res.status(200).json({ success: true, data: targetAccount.users })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        } 
    }

    public attributeAccountToCommunity = async (req: Request, res: Response) => {
        try {
            const { idUser, idAccount } = req.body
            const Community = await getRepository(User).findOne({ relations: ['accounts'], where: { id: idUser }})
            if (!Community)
                return res.json({ success: false })

            const targetAccount = await getRepository(Account).findOne({ relations: ['users'], where: { id: idAccount }})
            if (!targetAccount)
                return res.json({ success: false })

            if (targetAccount.users.findIndex((el: User) => el.id === idUser) === -1) {
                const newAccountList = [...Community.accounts, targetAccount]
                const newUserList = [...targetAccount.users, Community]
                Community.accounts = newAccountList
                targetAccount.users = newUserList

                await getRepository(User).save(Community)
                await getRepository(Account).save(targetAccount)
            }

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public dropAccountFromCommunity = async (req: Request, res: Response) => {
        try {
            const { idUser, idAccount } = req.body
            const Community = await getRepository(User).findOne({ relations: ['accounts'], where: { id: idUser }})
            if (!Community)
                return res.json({ success: false })

            const targetAccount = await getRepository(Account).findOne({ relations: ['users'], where: { id: idAccount }})
            if (!targetAccount)
                return res.json({ success: false })

            const newAccountList = [...Community.accounts].filter((el: Account) => el.id !== idAccount)
            const newUserList = [...targetAccount.users].filter((el: User) => el.id !== idUser)

            Community.accounts = newAccountList
            targetAccount.users = newUserList

            await getRepository(User).save(Community)
            await getRepository(Account).save(targetAccount)

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getCandidatForAccount = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            if (!id) return res.json({ success: false })

            const targetAccount = await getRepository(Account).findOne({ relations: ['users'], where: { id: parseInt(id, 10) }})
            if (!targetAccount) return res.json({ success: false })

            const alreadyAssigned = targetAccount.users.map((el: User) => el.id)
            const allUser = await getRepository(User).find()

            const data = allUser.filter((el: User) => alreadyAssigned.indexOf(el.id) === -1)

            return res.status(200).json({ success: true, data })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllAccountsOfCommunity = async (req: Request, res: Response) => {
        try {
            const { id } = req.params

            if (!id) return res.json({ success: false })

            const Community = await getRepository(User).findOne({ relations: ['accounts'], where: { id: parseInt(id, 10)} })
            if (!Community) return res.json({ success: false })

            const allAccountId = Community.accounts.map((el: Account) => el.id)

            if (allAccountId.length === 0)
                return res.status(200).json({ success: true, data: [] })

            const allAccounts = await getRepository(Account)
            .createQueryBuilder('accounts')
            .leftJoinAndSelect('accounts.client', 'clients')
            .where('accounts.id IN (:...ids)', { ids: allAccountId })
            .getMany()

            const accounts = allAccounts.map((el: Account) => {
                if (el.type === 'facebook')
                    return {
                        id: el.id,
                        type: el.type,
                        name: el.accountName,
                        client: el.client,
                        users: el.users,
                        accountType: 'personnal',
                        managerAccountId: el.id
                    }
                return {
                    id: el.id,
                    type: el.type,
                    name: el.accountName,
                    client: el.client,
                    users: el.users,
                    accountType: 'personnal',
                    managerAccountId: null
                }
            })


            return res.status(200).json({ success: true, data: accounts })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public createPost = async (req: Request, res: Response) => {
        try {
            /** verify access */
            const { access } = req.query
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get token access */
            const accountAccess = await getAccountAccess(state.id, state.accountType, state.managerAccountId, state.type)
            if (!accountAccess) return res.status(400).json({ success: false })
            
            /** create publication */
            const id = parseInt(accountAccess.accountId, 10)
            const response = await SharePost(id, state.type, state.accountType, accountAccess.access_token, req)
            console.log(response)

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public uploadWithSegmentation = async (req: Request, res: Response) => {
        try {
            const uploadedFile = await VideoUploader(req)
            console.log(uploadedFile)
            if (!uploadedFile) return res.status(400).json({ success: false })

            return res.status(200).json({ success: true, message: uploadedFile })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }
}