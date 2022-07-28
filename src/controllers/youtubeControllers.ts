import { Request, Response } from 'express'
import { getRepository } from 'typeorm'
import axios from 'axios'
import moment from 'moment'
import { google, youtube_v3 } from 'googleapis'
import { createReadStream } from 'fs'
// import * as qs from 'query-string' 
import { decodeState, refreshGoogleToken, Uploader } from '../factory/factory'
// import Configuration from '../config/config'
import GoogleConfig from '../config/google'
import Client from '../entity/Clients'
import Account from '../entity/Accounts'
import Waitingposts from '../entity/WaitingPosts'

// const { serverConfig } = Configuration

export default class YoutubeControllers {
    protected oauth2Client = new google.auth.OAuth2(
        GoogleConfig.appId,
        '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',
        GoogleConfig.redirectUri
    );

    public  GenerateOAuthUrl = async (req: Request, res: Response) => {
        try {
            // generate a url that asks permissions for Blogger and Google Calendar scopes
            const scopes = [
                'openid',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
                'https://www.googleapis.com/auth/youtube.force-ssl',
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/youtube.upload',
                'https://www.googleapis.com/auth/youtubepartner',
                'https://www.googleapis.com/auth/youtubepartner-channel-audit'
            ];
            
            const url = this.oauth2Client.generateAuthUrl({
                // 'online' (default) or 'offline' (gets refresh_token)
                access_type: 'offline',
            
                // If you only need one scope you can pass it as a string
                scope: scopes
            });

            console.log(url)

            return res.status(200).json({ success: true, data: url })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    } 

    public Login = async (req: Request, res: Response) => {
        try {
            const { code, state } = req.query

            if (!code || !state) return res.status(400).json({ success: false })
            const Accounts = new Account()
            
            const { tokens } = await this.oauth2Client.getToken(req.query.code as string)

            const stateData = decodeState(req.query.state as string)

            const data = { ...tokens, ...req.query }
            const user = (await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
                headers: {
                    Authorization: `Bearer ${data.access_token}`
                }
            })).data

            const Clients = await getRepository(Client).findOne({ id: stateData.id })

            const existingAccount = await getRepository(Account).findOne({ accountId: user.id })
            
            if (existingAccount) {
                Accounts.expireIn = moment().add(3599, 'seconds').unix()
                existingAccount.token = data.access_token as string

                await getRepository(Account).save(existingAccount)
            }

            if (!existingAccount && Clients && data.id_token && data.refresh_token && data.access_token && user.id && user.name) {
                Accounts.client = Clients
                Accounts.expireIn = moment().add(3599, 'seconds').unix()
                Accounts.refreshToken = data.refresh_token
                Accounts.idToken = data.id_token
                Accounts.type = "youtube"
                Accounts.accountId = user.id
                Accounts.accountName = user.name
                Accounts.token = data.access_token

                await getRepository(Account).save(Accounts)
            } 

            return res.redirect(stateData.url)
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public createPlaylist = async (req: Request, res: Response) => {
        try {
            const description = req.body.description ?? ''
            const privacyStatus = req.body.privacyStatus ?? 'public'
            const { title } = req.body
            const { access } = req.params

            if (!title) return res.status(400).json({ success: false })

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            const youtube = google.youtube('v3')
            const response = (await youtube.playlists.insert({
                access_token: accountAccess,
                part: ['id', 'snippet', 'status'],
                requestBody: {
                    snippet: {
                        title,
                        description,
                    },
                    status: {
                        privacyStatus,
                    }
                }
            })).data

            console.log(response)

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error.response)

            return res.status(500).json({ success: false })
        }
    }

    public getAllPlaylist = async (req: Request, res: Response) => {
        try {
            const { access } = req.params

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            const youtube = google.youtube('v3')
            const response = (await youtube.playlists.list({
                access_token: accountAccess,
                part: ['id', 'snippet', 'status', 'contentDetails'],
                mine: true,
            })).data

            console.log(response)

            return res.status(200).json({ success: true, data: response.items })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    // post video

    public PublishVideo = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { title, description, playlist } = req.body

            if (!title || !description || !playlist) return res.status(400).json({ success: false })

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            // upload files
            const uploadedFiles = await Uploader(req)
            if (!uploadedFiles) return res.status(500).json({ success: false })

            const File = uploadedFiles[0]

            // upload video
            const youtube = google.youtube('v3'/* { version: 'v3', auth: data.access} */)
            if (File) {
                const response = (await youtube.videos.insert(
                    {
                        access_token: accountAccess,
                        requestBody: {
                            // Video title and description
                            snippet: {
                                title: title as string, // data.title
                                description: description as string
                            },
                            // I don't want to spam my subscribers
                            status: {
                                privacyStatus: "public",
                            },
                        },
                        // This is for the callback function
                        part: ['id', 'snippet', 'status'],
            
                        // Create the readable stream to upload the video
                        media: {
                            body: createReadStream(File.path)
                        },
                    }
                )).data

                if (!response) return res.status(400).json({ success: false })

                const result = (await youtube.playlistItems.insert({
                    access_token: accountAccess,
                    part: ['id', 'snippet', 'status'],
                    requestBody: {
                        snippet: {
                            playlistId: playlist,
                            resourceId: {
                                channelId: response.snippet?.channelId,
                                kind: response.kind,
                                playlistId: playlist,
                                videoId: response.id
                            }
                        }
                    }
                })).data

                console.log(result)
            }

            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public createSchedulePost = async (req: Request, res: Response) => {
        try {
            const { access } = req.params
            const { title, description, playlist } = req.body

            if (!title || !description || !playlist) return res.status(400).json({ success: false })

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            // upload files
            const uploadedFiles = await Uploader(req)
            if (!uploadedFiles) return res.status(500).json({ success: false })

            const File = uploadedFiles[0]

            // upload video
            const youtube = google.youtube('v3'/* { version: 'v3', auth: data.access} */)
            if (File) {
                const response = (await youtube.videos.insert(
                    {
                        access_token: accountAccess,
                        requestBody: {
                            // Video title and description
                            snippet: {
                                title: title as string, // data.title
                                description: description as string
                            },
                            // I don't want to spam my subscribers
                            status: {
                                privacyStatus: "private",
                            },
                        },
                        // This is for the callback function
                        part: ['id', 'snippet', 'status'],
            
                        // Create the readable stream to upload the video
                        media: {
                            body: createReadStream(File.path)
                        },
                    }
                )).data

                if (!response) return res.status(400).json({ success: false })

                const result = (await youtube.playlistItems.insert({
                    access_token: accountAccess,
                    part: ['id', 'snippet', 'status'],
                    requestBody: {
                        snippet: {
                            playlistId: playlist,
                            resourceId: {
                                channelId: response.snippet?.channelId,
                                kind: response.kind,
                                playlistId: playlist,
                                videoId: response.id
                            }
                        }
                    }
                })).data

                console.log(result)

                // get account
                const account = await getRepository(Account).findOne({ id: state.id })
                if (!account) return res.status(500).json({ success: false })
                // save in waiting posts
                const posts = new Waitingposts()
                posts.account = account
                posts.title = title
                posts.pageId = state.id
                posts.publishDate = req.body.publishDate
                posts.postId = response.id as string

                await getRepository(Waitingposts).save(posts)
            }


            return res.status(200).json({ success: true })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getVideosOfPlaylist = async (req: Request, res: Response) => {
        try {
            const { access, playlist } = req.params

            if (!access || !playlist) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            const youtube = google.youtube('v3')
            const response = (await youtube.playlistItems.list({
                access_token: accountAccess,
                part: ['id', 'snippet', 'status'],
                playlistId: playlist
            })).data

            if (!response) return res.status(500).json({ success: false })

            const videos = response.items  as youtube_v3.Schema$PlaylistItem[]

            const videoIds = videos.map((item) => item.snippet?.resourceId?.videoId as string)

            console.log(videoIds)

            const result = (await youtube.videos.list({
                access_token: accountAccess,
                part: ['id', 'snippet', 'status', 'statistics', 'player'],
                id: videoIds
            })).data

            if (!result) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: result.items })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getVideo = async (req: Request, res: Response) => {
        try {
            const { access, video } = req.params

            if (!access || !video) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            const youtube = google.youtube('v3')
            const response = (await youtube.videos.list({
                access_token: accountAccess,
                part: ['id', 'snippet', 'status', 'statistics', 'player'],
                id: [video]
            })).data

            if (!response) return res.status(400).json({ success: false })

            return res.status(200).json({ success: true, data: response })
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }

    public getChannelStatistique = async (req: Request, res: Response) => {
        try {
            const { access } = req.params

            if (!access) return res.status(400).json({ success: false })
            const state = decodeState(access as string)

            const accountAccess = await refreshGoogleToken(state.id)

            const youtube = google.youtube('v3')
            const response = (await youtube.channels.list({
                access_token: accountAccess,
                part: ['id', 'statistics'],
                mine: true
            })).data

            const channelList = response.items as youtube_v3.Schema$Channel[]
            const channel = channelList[0] 

            if (!response) return res.status(500).json({ success: false })

            return res.status(200).json({ success: true, data: channel?.statistics})
        }
        catch (error) {
            console.log(error)

            return res.status(500).json({ success: false })
        }
    }
}