/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/prefer-default-export */
import { Request } from 'express'
import { UploadedFile } from 'express-fileupload'
import { getRepository } from 'typeorm'
import { unlinkSync, createReadStream } from 'fs'
import { google } from 'googleapis'
import path from 'path'
import axios from 'axios'
import moment from 'moment'
import qs from 'query-string'
import Account  from '../entity/Accounts'
import Waitingposts from '../entity/WaitingPosts'
import GoogleConfig from '../config/google'

export interface IUploadStats {
    filename: string
    name: string
    type: string
    extension: string
    path: string
}

export interface IPostData {
    access: string
    text: string
    link?: string
    files?: Array<any>
    title?: string
    fileSize?: number
}


export const decodeState = (encoded: string) => {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
}

/**
 * Pour facebook, pinterest et instagram, on a besoin que les fichiers soient sur un serveur public et récupérer avec le endpoint /grs/file/{filename}
 * Pour youtube on utilise le chemin réel '/upload/{filename}'
 */

export const UploadFile = async (file: UploadedFile) => {
    try {
        if (!file) return undefined;
        const destPath = `${__dirname}/../upload/${file.name}`
        let filePath = ''

        await file.mv(destPath)

        if (process.env.NODE_ENV !== 'production') {
            // filePath = `${process.env.SERVER_URL}/file/${file.name}`
            filePath = `${__dirname}/../upload/${file.name}`
        }
        else {
            if (`${file.mimetype}`.split('/')[0] === "video") 
                filePath = `../upload/${file.name}`
            if (`${file.mimetype}`.split('/')[0] === "image") 
                filePath = process.env.PHOTO_URL_EXAMPLE as string
        }

        return {
            filename: `${file.name}`.split('.')[0],
            name: file.name,
            type: file.mimetype,
            extension: `${file.mimetype}`.split('/')[1],
            path: filePath
            // path: `https://localhost:1337/grs/file/${file.name}`
            // path: 'https://cherry.img.pmdstatic.net/fit/https.3A.2F.2Fimg.2Emaxisciences.2Ecom.2Fs3.2Ffrgsd.2Fmourir-moins-con.2Fdefault_2021-06-08_32f61c6a-12e0-4426-948c-a854df3ca667.2Ejpeg/1200x675/quality/80/voiture-ferrari-rouge-couleur-emblematique-de-la-marque.jpg'
            // path // : 'http://clips.vorwaerts-gmbh.de/VfE_html5.mp4'
            // path: 'https://bestplace.mg/upload/thumbnails/2021/07/06/08/07/2y326i2ddg.jpg' 
        } as IUploadStats
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

export const Uploader = async (req: Request) => {
    try {
        const stats: Array<IUploadStats> = []

        if (!req.files) return undefined
        
        const Files = req.files.file

        if (!Files) return undefined

        if (Array.isArray(Files)) {
            // eslint-disable-next-line no-restricted-syntax
            for (const file of Files) {
                const uploaded = await UploadFile(file)
                if (uploaded) stats.push(uploaded)
            }
        }
        else {
            const uploaded = await UploadFile(Files)
            if (uploaded) stats.push(uploaded)
        }

        return stats
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

export const getAccountAccess = async (id: string, accountType: string, managerAccountId?: string, type?: string) => {
    try {
        if (!id || !accountType)
            return undefined

        if (accountType === 'personnal') {
            const Compte = await getRepository(Account).findOne({ id: parseInt(id, 10)})
            if (!Compte) return undefined

            return {
                accountId: Compte.accountId,
                access_token: Compte.token,
                secret_token: Compte.idToken
            }
        }
        
        if (accountType === 'page' && managerAccountId) {
            const Compte = await getRepository(Account).findOne({ id: parseInt(managerAccountId, 10)})
            if (!Compte) return undefined

            if (type === 'instagram' && Compte.type === 'facebook')
                return {
                    accountId: id,
                    access_token: Compte.token
                }

            const response = (await axios.get(`https://graph.facebook.com/${id}?fields=access_token&access_token=${Compte.token}`)).data
            if (!response.id) return undefined

            return {
                accountId: id,
                access_token: response.access_token
            }
        }

        return undefined
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

/** @params
 * id: account ID
 * postType: type de la publication
 * accountType: page | personnal
 * data: Post data
 */

export const CreateFacebookPost = async (id: string | number, postType: string, accountType: string, data: IPostData, publishDate?: number, published=true) => {
    try {
        let response
        if (accountType === 'page') {
            if (published) {
                if (postType === 'text') 
                    response = (await axios.post(`https://graph.facebook.com/${id}/feed?published=true&message=${data.text}&access_token=${data.access}`)).data

                if (postType === 'link')
                    response = (await axios.post(`https://graph.facebook.com/${id}/feed?published=true&message=${data.text}&link=${data.link}&access_token=${data.access}`)).data

                if (postType === 'photo' && data.files) {
                    response = (await axios.post(`https://graph.facebook.com/${id}/photos?published=true&url=${data.files[0].path}&caption=${data.text}&access_token=${data.access}`))
                    for (const file of data.files)
                        unlinkSync(file.path) 
                }
                // gestion de publication de vidéo

                // veillez à supprimer le fichier après upload

                if (postType === 'video' && data.files && data.fileSize) {
                    // 1 -  open session
                    const session = (await axios.post(`https://graph-video.facebook.com/v14.0/1755847768034402/videos?upload_phase=start&access_token=${data.access}&file_size=${data.fileSize}`)).data
                    if (!session) return undefined
                    
                    const videoId = session.video_id // (optional)
                    let start = session.start_offset
                    const sessionId = session.upload_session_id
                    // 2 - upload parts
                    const parts = data.files as Array<string>
                    for (const part of parts) {
                        const filePath = path.resolve(`src/segment/${part}`)
                        const upload = (await axios.post(`https://graph-video.facebook.com/v14.0/1755847768034402/videos?upload_phase=transfer&upload_session_id=${sessionId}&access_token=${data.access}&start_offset=${start}&video_file_chunk=${filePath}`)).data
                        if (!upload) {
                            await axios.post(`https://graph-video.facebook.com/v14.0/1755847768034402/videos?upload_phase=finish&access_token=${data.access}&upload_session_id=${sessionId}`)
                            return undefined
                        }
                        start = upload.start_offset
                    }
                    // 3 - close session
                    await axios.post(`https://graph-video.facebook.com/v14.0/1755847768034402/videos?upload_phase=finish&access_token=${data.access}&upload_session_id=${sessionId}`)
                    
                    // 4 - format response
                    response = {
                        id: videoId
                    }
                }

                if (!response.id) return undefined
            }
            else {
                if (postType === 'text') 
                    response = (await axios.post(`https://graph.facebook.com/${id}/feed?published=false&message=${data.text}&scheduled_publish_time=${publishDate}&access_token=${data.access}`)).data

                if (postType === 'link')
                    response = (await axios.post(`https://graph.facebook.com/${id}/feed?published=false&message=${data.text}&scheduled_publish_time=${publishDate}&link=${data.link}&access_token=${data.access}`)).data

                if (postType === 'photo' && data.files) {
                    response = (await axios.post(`https://graph.facebook.com/${id}/photos?published=false&url=${data.files[0].path}&caption=${data.text}&scheduled_publish_time=${publishDate}&access_token=${data.access}`))
                    for (const file of data.files)
                        unlinkSync(file.path) 
                }
            }
        }

        return response
    }
    catch (error) {
        console.log(error.response.data)

        return undefined
    }
}


export const CreateInstagramPost = async (id: number, accountType: string, data: IPostData, publishDate?: number, published=true) => {
    try {
        let response
        const mulltimediaContent = []
        let mediaContainer = ''
        if (accountType === 'page' && data.files) {
            /** isCaroussel */
            const files = data.files as Array<IUploadStats>
            if (files.length > 1) {
                /** create element container */
                for (const file of files) {
                    if (file.type.indexOf('image') !== -1) {
                        const result = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media?is_carousel_item=true&image_url=${file.path}&access_token=${data.access}`)).data
                        if (result.id) mulltimediaContent.push(result.id)
                    } else if (file.type.indexOf('video') !== -1) {
                        const result = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media?is_carousel_item=true&media_type=VIDEO&video_url=${file.path}&access_token=${data.access}`)).data
                        if (result.id) mulltimediaContent.push(result.id)
                    }
                }

                /** create carrousel content */
                const children = mulltimediaContent.join('%2C')
                const result = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media?caption=${data.text}&media_type=CAROUSEL&children=${children}&access_token=${data.access}`)).data
                if (result.id) mediaContainer = result.id
            }
            else {
                console.log('request information: ', id, accountType, data)
                /** create element container */
                for (const file of files) {
                    if (file.type.indexOf('image') !== -1) {
                        const result = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media?caption=${data.text}&image_url=${file.path}&access_token=${data.access}`)).data
                        if (result.id) mediaContainer = result.id
                    } else if (file.type.indexOf('video') !== -1) {
                        const result = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media?caption=${data.text}&media_type=VIDEO&video_url=${file.path}&access_token=${data.access}`)).data
                        if (result.id) mediaContainer = result.id
                    }
                }
            }
            
            console.log(mediaContainer)

            if (!published && publishDate) {
                // recuperation de la compte
                const account = await getRepository(Account).findOne({ id })
                if (!account) return undefined

                const posts = new Waitingposts()
                posts.account = account
                posts.description = data.text
                posts.pageId = `${id}`
                posts.publishDate = new Date(publishDate)
                posts.postId = mediaContainer
                posts.type = 'page'

                await getRepository(Waitingposts).save(posts)
            }
            else
                response = (await axios.post(`https://graph.facebook.com/v13.0/${id}/media_publish?creation_id=${mediaContainer}&access_token=${data.access}`)).data
        }

        if (!response.id) return undefined

        return response
    }
    catch (error) {
        console.log(error.response.data)

        return undefined
    }
}

export const CreateYoutubePost = async (data: IPostData) => {
    try {
        if (data.files) {
            const youtube = google.youtube('v3'/* { version: 'v3', auth: data.access} */)
            const response = await youtube.videos.insert(
                {
                    access_token: data.access,
                    requestBody: {
                        // Video title and description
                        snippet: {
                            title: 'test', // data.title
                            description: data.text
                        },
                        // I don't want to spam my subscribers
                        status: {
                            privacyStatus: "public",
                        },
                    },
                    // This is for the callback function
                    part: ['snippet', 'status'],
        
                    // Create the readable stream to upload the video
                    media: {
                        body: createReadStream(data.files[0].path)
                    },
                }
            )

            return response.data
        }
        return undefined
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

/**
 * params
 * id: account Id
 * accountType: facebook | twitter | google | pinterest | linkedin
 * accountCategory: page | personnal
 * access: access token
 * req: Request
 */

export const SharePost = async (id: number, accountType: string, accountCategory: string, access: string, req: Request) => {
    try {
        const { type } = req.body
        if (!type) return undefined

        const data = {} as IPostData
        let response
        data.text = req.body.text
        data.access = access
        if (type === 'photo' || type === 'video' || type === 'media') {
            const uploadedFiles = await Uploader(req)
            // console.log(uploadedFiles)
            if (!uploadedFiles) return undefined
            data.files = uploadedFiles
        }

        if (type === 'link') {
            data.link = req.body.link
        }


        if (accountType === 'facebook') 
            response = await CreateFacebookPost(id, type, accountCategory, data)

        if (accountType === 'instagram')
            response = await CreateInstagramPost(id, accountCategory, data)

        if (accountType === 'youtube') {
            data.title = req.body.title
            response = await CreateYoutubePost(data)
        }

        return response
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}


export const refreshGoogleToken = async (id: number) => {
    try {
        if (!id) return undefined

        const account = await getRepository(Account).findOne({ id })

        if (!account) return undefined

        const now = moment().unix()
        const diff = account.expireIn - now

        if (diff < 0) {
            const postBody = {
                client_id: GoogleConfig.appId,
                client_secret: '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',
                refresh_token: account.refreshToken,
                grant_type: 'refresh_token'
            }
            const response = (await axios.post('https://oauth2.googleapis.com/token', qs.stringify(postBody))).data
            if (!response) return undefined

            account.token = response.access_token
            account.idToken = response.id_token
            account.expireIn = moment().add(3599, 'seconds').unix()
            if (response.refresh_token) account.refreshToken = response.refresh_token

            await getRepository(Account).save(account)
        }

        return account.token
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

export const refreshPinterestToken = async (id: number) => {
    try {
        if (!id) return undefined

        const account = await getRepository(Account).findOne({ id })

        if (!account) return undefined

        const now = moment().unix()
        const diff = account.expireIn - now

        if (diff < 0) {
            /** construction du body */
            const bodyPost = {
                grant_type: 'refresh_token',
                refresh_token: account.refreshToken,
                scope: 'ads:read,boards:read,boards:write,pins:read,pins:write,user_accounts:read'
            }
            /** générate authorization base64 */
            const auth = btoa('1476576:f476b0b636ae6204ecbceb88c6b99431a179d7f7')

            const response = (await axios.post(`https://api.pinterest.com/v5/oauth/token`, qs.stringify(bodyPost), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'content-type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                }
            })).data

            if (!response) return undefined

            account.token = response.access_token
            account.expireIn = moment().add(response.expires_in, 'seconds').unix()

            await getRepository(Account).save(account)
        }

        return account.token
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}