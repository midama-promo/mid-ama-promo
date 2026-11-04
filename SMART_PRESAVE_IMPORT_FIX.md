# Smart Pre-Save importer update

The SoundBlast / Feature.fm importer now:

- follows a maximum of five HTTPS redirects, validating each redirect remains on an approved SoundBlast / Feature.fm host;
- reads the Feature.fm page title and splits `Track - Artist` into separate fields when dedicated metadata is not present;
- reads the visible `api.ffm.to/sl/e/ps/...` and `/po/...` action links;
- decodes the Feature.fm `cd` base64url payload to identify the DSP service (`srvc`), while preserving the original action URL so its pre-save authorization flow still works;
- supports Spotify, Apple Music, Deezer, Amazon Music, SoundCloud, TIDAL, YouTube Music and other common DSP labels.

The supplied example link was inspected: its page title is **Izolo - Aynomusiq ZA**, and it exposes six service action buttons. The importer fix is designed to extract those actual action URLs rather than trying to identify a DSP from the `api.ffm.to` hostname.

Validation: the modified `server/routes.ts` passed TypeScript transpilation syntax diagnostics. A full dependency-backed production build was not run because dependency installation timed out in this environment.
