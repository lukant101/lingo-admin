# Media Formats

## Support and Specs References

- GCP Transcoder API [Supported input and output formats](https://docs.cloud.google.com/transcoder/docs/concepts/supported-input-and-output-formats)
- TikTok [Media Transfer Guide](https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide?enter_method=left_navigation)
- TikTok [Specifications for customizing an Instant Page](https://ads.tiktok.com/help/article/customize-instant-page?lang=en)
- [Instagram Format : 2025 image and video format guide](https://www.impulse-analytics.com/en/instagram-format/)
- [Supported YouTube file formats](https://support.google.com/youtube/troubleshooter/2888402?hl=en)
- Youtube [About video ad specs](https://support.google.com/google-ads/answer/13547298?hl=en)
- Android [Supported media formats](https://developer.android.com/media/platform/supported-formats)
- [ExoPlayer support](https://developer.android.com/media/media3/exoplayer/supported-formats) - native video player on Android
- [Using HEIF or HEVC media on Apple devices](https://support.apple.com/en-us/116944)
- Spotify [Video specs](https://support.spotify.com/us/creators/article/video-specs/)
- Spotify [Audio file formats for Spotify](https://support.spotify.com/us/artists/article/audio-file-formats/)
- Spotify [Publishing videos](https://support.spotify.com/us/creators/article/publishing-videos/)
- Spotify [Publishing audio episodes in Spotify for Creators](https://support.spotify.com/us/creators/article/publishing-audio-episodes/)
- Spotify [Audio quality](https://support.spotify.com/ca-en/article/audio-quality/)

## Current Support

- video support: input containers: mp4, mov; output: hls, H.264 AAC mp4
- audio support: (no transcoding) m4a and mp4 (AAC), mp3, wav
- image support: webp (preferred), jpeg/jpg, png

Note: mp4 is generally used for video, but it could be audio only; for example, DaVinci Resolve exports audio as mp4.

### Maximum file size

- images: 3 MB (up to HD resolution)
- audio: 3 MB (up to 10 seconds)
- video: 500 MB (up to 3 minutes)

### Implementation Notes

- for videos, we don't probe the codec - we only validate the container and the file size
- for generating video previews, we heck container and codec. We transcode if codec is not H.264 AAC (also change container from mov to mp4 if the codec is H.264 ACC)

Note that reviewers see the original video uploaded; most mp4 and mov videos will be encoded with H.264 AAC. Many might also have H.265 AAC encoding, which might not play on some browsers (ex. Firefox). H.265 is native to iOS and Safari; it generally works on the major Chromium-based browsers. But to be sure that reviewers can watch the videos, we would need to only serve H.264 AAC.

## Future Support

- HEIF images (ios default) - will need to do convert (probably a separate nestjs or golang application) and output to webp (only very old iOS devices don't support it; most efficient)
  - I see that files are saved with heic extension but if you check "Get Info" on mac, it shows file format as HEIF
  - [browser support](https://caniuse.com/heif) - only Safari. So we would need to convert before making available for review (i.e. before approval)
  - [Android supports it](https://developer.android.com/media/platform/supported-formats)
  - [Using HEIF or HEVC media on Apple devices](https://support.apple.com/en-us/116944)
- after submission but before review, convert all videos that don't use H.264 AAC to this codec (and use container mp4).
  - mov containers with H.264 AAC codes can be converted to - just need to convert the container, not transcode, so this is quick
  - if we do this, we are guaranteed that reviewers on all browsers, plus iOS and Android, will be able to see the videos.
- webm as video input - transcode to H.264 AAC mp4 (webm is not supported (or unreliable) on Safari and iOS)
- FLAC as audio input - transcode to AAC mp4
- transcode wav to AAC mp4 (wav files are uncompressed)

### Potential future support

- svg (issues on android with layout - I think it creates vertical bars for the background image)

## Services Used

- we use [GCP Transcoder API ](https://docs.cloud.google.com/transcoder/docs) for video and audio transcoding
- for `mp4` audio-only files that have AAC codec, just change the extension to `m4a`.

Bash command for changing extension `mp4` to `m4a` for all files in current directory

```
$ for f in *.mp4; do mv -n "$f" "${f%.mp4}.m4a"; done
```

for f in \*.m4a; do mv -n "$f" "${f%.m4a}.mp4"; done
