/* eslint-disable no-restricted-syntax */
import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import { decodeState, Uploader } from '../factory/factory'
import Accounts from '../entity/Accounts'
import Waitingposts from '../entity/WaitingPosts'
import Postfiles from '../entity/PostFiles'

export default class PostControllers {
    public Create = async (req: Request, res: Response) => {
        try {
            /** verify access */
            const { access } = req.query
            const { type } = req.body
            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            /** get account */
            const account = await getRepository(Accounts).findOne({ id: parseInt(state.id, 10) })
            if (!account) return res.status(400).json({ success: false, message: 'account not found!' })

            /** save post */
            const Waitingpost = new Waitingposts()
            Waitingpost.type = type
            Waitingpost.accountType = state.accountType
            Waitingpost.pageId = state.accountType === 'page' ? 'page' : ''
            Waitingpost.description = req.body.text
            Waitingpost.publishDate = new Date(req.body.date)
            Waitingpost.account = account

            await getRepository(Waitingposts).save(Waitingpost)

            /** if have a media content */
            if (req.files && (type === 'photo' || type === 'video' || type === 'media')) {
                const uploadedFile = await Uploader(req)
                if (!uploadedFile) return res.status(500).json({ success: false, message: 'Error occured on upload process' })

                for (const uploaded of uploadedFile) {
                    const PostFile = new Postfiles()
                    PostFile.filename = uploaded.name
                    PostFile.extension = uploaded.extension
                    PostFile.path = uploaded.path
                    PostFile.type = uploaded.type
                    PostFile.post = Waitingpost

                    await getRepository(Postfiles).save(PostFile)
                }
            }

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public GetAll = async (req: Request, res: Response) => {
        try {
            const posts = await getRepository(Waitingposts).find({ relations: ['files'] })
            if (!posts) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: posts })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getAllPostOfAccount = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            if (!id) return res.status(400).json({ success: false })

            const account = await getRepository(Accounts).findOne({ id: parseInt(id, 10) })
            if (!account) return res.status(404).json({ success: false })

            const posts = await getRepository(Waitingposts).find({ relations: ['files', 'account'], where: { account } })
            
            return res.status(200).json({ success: true, data: posts })
        }   
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }
}