import { Application } from 'express'
import grsControllers from '../controllers/grsControllers'
import FacebookControllers from '../controllers/facebookControllers'
import LinkedinControllers from '../controllers/linkedinControllers'
import InstagramControllers from '../controllers/instagramControllers'
import YoutubeControllers from '../controllers/youtubeControllers'
import TwitterControllers from '../controllers/twitterControllers'
import PinterestControllers from '../controllers/pinterestControllers'
import FileControllers from '../controllers/fileControllers'
import PostControllers from '../controllers/postControllers'


export default class Route {
    private GRS = new grsControllers()

    private Facebook = new FacebookControllers()

    private Linkedin = new LinkedinControllers()

    private Instagram = new InstagramControllers()

    private Youtube = new YoutubeControllers()

    private Twitter = new TwitterControllers()
    
    private Pinterest = new PinterestControllers()

    private File = new FileControllers()

    private Posts = new PostControllers()

    public routes = ( app: Application ) : void => {
        app.route('/grs/getapps').get(this.GRS.getApps)
        app.route('/grs/getclientaccounts/:id').get(this.GRS.getClientAccounts)
        app.route('/grs/getallaccounts').get(this.GRS.getAllAccounts)
        app.route('/grs/getallcandidatforaccount/:id').get(this.GRS.getCandidatForAccount)
        app.route('/grs/getallcommunity/:id').get(this.GRS.getAllCommunity)
        app.route('/grs/getallcommunityaccount/:id').get(this.GRS.getAllAccountsOfCommunity)
        app.route('/grs/attribute').put(this.GRS.attributeAccountToCommunity)
        app.route('/grs/dropaccountfromcommunity').put(this.GRS.dropAccountFromCommunity)
        app.route('/grs/deleteaccount/:id').delete(this.GRS.deleteAccount)
        app.route('/grs/createpost').post(this.GRS.createPost)
        app.route('/grs/file/:filename').get(this.File.getFile)
        app.route('/grs/upload').post(this.GRS.uploadWithSegmentation)

        app.route('/grs/posts/create').post(this.Posts.Create)
        app.route('/grs/posts').get(this.Posts.GetAll)
        app.route('/grs/posts/:id').get(this.Posts.getAllPostOfAccount)
        
        app.route('/grs/facebook/register').get(this.Facebook.Login)
        app.route('/grs/facebook/getmypages/:id').get(this.Facebook.getMyPages)
        app.route('/grs/facebook/getpagestats/:access').get(this.Facebook.getPageStats)
        app.route('/grs/facebook/getfeedcount/:access').get(this.Facebook.getPagePostCount)
        app.route('/grs/facebook/getpageposts/:access').get(this.Facebook.getPagePosts)
        app.route('/grs/facebook/getpost/:access').get(this.Facebook.getPost)
        app.route('/grs/facebook/getpostcomments/:access').get(this.Facebook.getPostComments)
        app.route('/grs/facebook/getpostreactions/:access').get(this.Facebook.getPostReactions)
        app.route('/grs/facebook/getpostshares/:access').get(this.Facebook.getPostShares)
        app.route('/grs/facebook/create/:access').post(this.Facebook.createPost)


        app.route('/grs/instagram/register').get(this.Instagram.Login)
        app.route('/grs/instagram/info/:access').get(this.Instagram.getAccountInfo)
        app.route('/grs/instagram/getpagestats/:access').get(this.Instagram.getAccountStats)
        app.route('/grs/instagram/getallposts/:access').get(this.Instagram.getAllPost)
        app.route('/grs/instagram/getallpostwithstats/:access').get(this.Instagram.getAllPostWithStats)
        app.route('/grs/instagram/getpostwithstats/:access').get(this.Instagram.getPostStats)
        app.route('/grs/instagram/create/:access').post(this.Instagram.createPost)

        app.route('/grs/google/youtube/register').get(this.Youtube.Login)
        app.route('/grs/google/youtube/generateurl').get(this.Youtube.GenerateOAuthUrl)
        app.route('/grs/google/youtube/channel/:access').get(this.Youtube.getChannelStatistique) 
        app.route('/grs/google/youtube/getvideo/:video/:access').get(this.Youtube.getVideo)
        app.route('/grs/google/youtube/getplaylists/:access').get(this.Youtube.getAllPlaylist)
        app.route('/grs/google/youtube/getplaylistvideos/:playlist/:access').get(this.Youtube.getVideosOfPlaylist)
        app.route('/grs/google/youtube/playlist/create/:access').post(this.Youtube.createPlaylist)
        app.route('/grs/google/youtube/video/create/:access').post(this.Youtube.PublishVideo)

        app.route('/grs/pinterest/register').get(this.Pinterest.Login)
        app.route('/grs/pinterest/myaccount/:access').get(this.Pinterest.getAccountInfo)
        app.route('/grs/pinterest/getallboard/:access').get(this.Pinterest.getAllBoards)
        app.route('/grs/pinterest/getboardsections/:access').get(this.Pinterest.getAllBoardSection)
        app.route('/grs/pinterest/getpins/:access').get(this.Pinterest.getAllPins)
        app.route('/grs/pinterest/getpin/:access').get(this.Pinterest.getPinInfo)
        app.route('/grs/pinterest/countpin/:access').get(this.Pinterest.getPinCount)
        app.route('/grs/pinterest/createboard/:access').post(this.Pinterest.createBoard)
        app.route('/grs/pinterest/createsection/:access').post(this.Pinterest.createSectionBoard)
        app.route('/grs/pinterest/createpin/:access').post(this.Pinterest.createPins)

        app.route('/grs/twitter/register').get(this.Twitter.Login)
        app.route('/grs/twitter/request_token').get(this.Twitter.RequestToken)
        app.route('/grs/twitter/create/:access').post(this.Twitter.CreatePost)

        app.route('/grs/linkedin/register').get(this.Linkedin.Login)
    }
}