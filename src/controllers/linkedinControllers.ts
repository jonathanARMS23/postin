import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import axios from 'axios'
import { decodeState } from '../factory/factory'
import Configuration from '../config/config'
import Client from '../entity/Clients'
import Account from '../entity/Accounts'

const { serverConfig } = Configuration

export default class LinkedinControllers {
    public Login = async (req: Request, res: Response) => {
        try {
            const Accounts = new Account()
            const response = await axios.post(`https://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&code=${req.query.code}&redirect_uri=${serverConfig.serverURL}/grs/linkedin/register&client_id=77g4yxut7um599&client_secret=KS9GnRvI9z5VJP9O`)
            const data = { ...response.data, ...req.query }
            const state = decodeState(data.state)
            const user = (await axios.get(`https://api.linkedin.com/v2/me`, {
                headers: {
                    Authorization: `Bearer ${data.access_token}`,
                }
            })).data
            const Clients = await getRepository(Client).findOne({ id: state.id })
            const existingAccount = await getRepository(Account).findOne({ accountId: user.id })
            
            if (existingAccount) {
                existingAccount.expireIn = data.expires_in
                existingAccount.token = data.access_token

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && data.access_token && user.id && user.localizedLastName && user.localizedFirstName) {
                Accounts.client = Clients
                Accounts.expireIn = data.expires_in
                Accounts.refreshToken = ""
                Accounts.type = "linkedin"
                Accounts.accountId = user.id
                Accounts.accountName = `${user.localizedFirstName} ${user.localizedLastName}`
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
}