# Raven Video Android Compatibility Migration

Date: 2026-07-23

## Reason

The four published Raven videos used H.264 High 4:4:4 Predictive
(`avc1.F4001F`). That profile is not supported by common Android hardware
decoders.

Each video was transcoded to:

- H.264 High profile
- YUV 4:2:0 (`yuv420p`)
- AAC audio
- MP4 fast-start layout
- Maximum width of 720 pixels

The original storage objects were retained. New objects were uploaded to an
`android-compatible` folder, and `public.raven_videos.storage_path` was updated
to reference them.

## Object Mapping

| Video ID | Title | Original path | Active path |
| --- | --- | --- | --- |
| `c0ca2a8b-40f7-4196-9144-914e781c5064` | Enrollment | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/4294fd89-6737-4753-9890-671c2b0baa6d.mp4` | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/android-compatible/c0ca2a8b-40f7-4196-9144-914e781c5064-20260723.mp4` |
| `66e6bed8-6a91-4cfd-a01e-483c2dcb13ac` | Tours | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/fdce5abf-d98d-48b3-b23b-e9c96e821b0a.mp4` | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/android-compatible/66e6bed8-6a91-4cfd-a01e-483c2dcb13ac-20260723.mp4` |
| `c5cb65e0-72cd-4ad5-9939-668d97449d3f` | File 3 | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/0619ad5a-4905-4a4a-a1cf-0ae99582d4e8.mp4` | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/android-compatible/c5cb65e0-72cd-4ad5-9939-668d97449d3f-20260723.mp4` |
| `718e7337-317a-4493-8d9b-8ccb620923b8` | file 4 | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/cc88fa7a-abf8-47a4-80e6-15369ed5ff2a.mp4` | `bf20a11f-2edf-4fe9-b93f-5dd009164fee/android-compatible/718e7337-317a-4493-8d9b-8ccb620923b8-20260723.mp4` |

## Verification

- All four active objects returned HTTP `206 Partial Content`.
- All four active objects returned `Content-Type: video/mp4`.
- All four outputs were verified as H.264 High and `yuv420p`.
- Android API 36 emulator playback produced changing video frames.
- Media3 reported no playback or load errors.

## Database Rollback

Run this only if the original encodings need to be restored:

```sql
update public.raven_videos
set storage_path = case id
  when 'c0ca2a8b-40f7-4196-9144-914e781c5064'::uuid
    then 'bf20a11f-2edf-4fe9-b93f-5dd009164fee/4294fd89-6737-4753-9890-671c2b0baa6d.mp4'
  when '66e6bed8-6a91-4cfd-a01e-483c2dcb13ac'::uuid
    then 'bf20a11f-2edf-4fe9-b93f-5dd009164fee/fdce5abf-d98d-48b3-b23b-e9c96e821b0a.mp4'
  when 'c5cb65e0-72cd-4ad5-9939-668d97449d3f'::uuid
    then 'bf20a11f-2edf-4fe9-b93f-5dd009164fee/0619ad5a-4905-4a4a-a1cf-0ae99582d4e8.mp4'
  when '718e7337-317a-4493-8d9b-8ccb620923b8'::uuid
    then 'bf20a11f-2edf-4fe9-b93f-5dd009164fee/cc88fa7a-abf8-47a4-80e6-15369ed5ff2a.mp4'
end
where id in (
  'c0ca2a8b-40f7-4196-9144-914e781c5064'::uuid,
  '66e6bed8-6a91-4cfd-a01e-483c2dcb13ac'::uuid,
  'c5cb65e0-72cd-4ad5-9939-668d97449d3f'::uuid,
  '718e7337-317a-4493-8d9b-8ccb620923b8'::uuid
);
```
