import { UploadedFile } from 'express-fileupload';
/* eslint-disable import/prefer-default-export */
import { Request } from 'express'
import { createReadStream, statSync, createWriteStream } from 'fs'
// import Ffmpeg from "fluent-ffmpeg"
import path from 'path'
import { UploadFile } from './factory'

/** export const GenerateSegmentation = (filePath: string, filename: string) => {
    const resolvePath = path.resolve(filePath)
    console.log(resolvePath)
    const file = createReadStream(resolvePath)
    console.log(file)
    const command = Ffmpeg(file, { timeout: 432000 })
        .addOption([
            '-profile:v baseline',
            '-f segment',
            '-level 3.0',
            '-start_number 0',
            '-hls_base_url segment/',
            `-hls_segment_filename src/segment/${filename}%03d.ts`,
            // Apple recommended time = 6,
            // In seconds
            '-hls_time 6',
            '-hls_list_size 0',
            // format
            '-f hls',
        ])
        .output(`${filename}.m3u8`)
        .on('end', (stdout, stderr) => {
            if (stderr) console.log(`error: ${stderr}`)
            else console.log(`Transcoding succeeded ! ${stdout}`);
            process.exit(1);
        })
        .on('start', (commandLine) => {
            console.log('start', commandLine);
        })
        .on('codecData', (data) => {
            console.log(`Input is ${data.audio} audio with ${data.video} video`)
        })
        .on('progress', (progress) => {
            console.log(`Processing. Timemark: -> ${progress.timemark}`)
        })
        .on('stderr', (stderrLine) => {
            console.log(`Processing: ${stderrLine}`)
        })
        .on('error', (err) => {
            console.log(`Cannot process video: ${err.message}`)
        })
        .on('data', (chunk) => {
            console.log(`ffmpeg just wrote ${chunk.length} bytes`)
        })

    // run the command
    command.run()
} */

export const SplitVideo = async (file: string, splitSize: number, filename: string) => {
    try {
        const { size } = statSync(file)
        const partList = []

        if (!size || size < 1) return undefined
        if (size < splitSize) {
            const part = createReadStream(file, {
                start: 0,
                end: size,
            })
            const ws = createWriteStream(path.resolve(`src/segment/${filename}0`))
            part.pipe(ws)
            partList.push(`${filename}0`)
        }
        else {
            // calculate number or parts for the splitSize
            const parts = Math.floor(size / splitSize)
            
            // init loop parameters
            let lastByteSize = 0
            let i = 0

            // split file
            while (i < parts + 1) {
                const nextLastByteSize = lastByteSize + splitSize
                let endOfSplit = nextLastByteSize
                if (nextLastByteSize > size && lastByteSize < size)
                    endOfSplit = size
                const part = createReadStream(file, {
                    start: lastByteSize,
                    end: endOfSplit,
                })
                const ws = createWriteStream(path.resolve(`src/segment/${filename}${i}`))
                part.pipe(ws)
                partList.push(`${filename}${i}`)
                lastByteSize = endOfSplit
                i += 1
            }
        }

        return {
            partList,
            size
        }
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}

export const VideoUploader = async (req: Request) => {
    try {
        let File: UploadedFile

        if (!req.files) return undefined
        
        const Files = req.files.file
        if (!Files) return undefined

        if (Array.isArray(Files))
            File = Files[0] as UploadedFile
        else
            File = Files

        const uploaded = await UploadFile(File)
        if (!uploaded) return undefined

        const uploadedPath = `src/upload/${uploaded.name}`

        // GenerateSegmentation(uploadedPath, uploaded.filename)
        const segments = await SplitVideo(uploadedPath, 40000000, uploaded.filename)

        return segments
    }
    catch (error) {
        console.log(error)

        return undefined
    }
}