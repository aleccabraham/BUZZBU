import { google } from "googleapis"
import type { drive_v3 } from "googleapis"

export const PHOTO_APP_FOLDER = "PhotoApp"

export function getDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.drive({ version: "v3", auth })
}

export async function getOrCreatePhotoAppFolder(accessToken: string): Promise<string> {
  const drive = getDriveClient(accessToken)

  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${PHOTO_APP_FOLDER}' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  })

  if (res.data.files?.length) {
    return res.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name: PHOTO_APP_FOLDER,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  })

  return folder.data.id!
}

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  createdTime?: string
  size?: string
}

export type Album = {
  id: string
  name: string
  createdTime?: string
  coverThumbnail?: string
  itemCount: number
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}

export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/")
}

/** Bumps Google's thumbnail URL to a larger size. */
export function enlargeThumbnail(url: string, size = 800): string {
  return url.replace(/=s\d+$/, `=s${size}`)
}
