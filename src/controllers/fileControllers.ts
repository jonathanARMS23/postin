import { Request, Response } from 'express'
import path from 'path'

export default class FileControllers {
    public getFile = (req: Request, res: Response) => {
        const { filename } = req.params
        if (!filename) return res.status(500).json({ success: false })

        return res.sendFile(path.join(__dirname,`../upload/${filename}`))
    }
}