import lyrics from './lyrics'
import lastfm from './lastfm'
import subsonic from './subsonic'
import { loggedInUserIsAdmin } from '../utils'
import { SettingCategory } from '@/interfaces/settings'

import LyricsSvg from '@/assets/icons/lyrics.svg?raw'
import LastfmSvg from '@/assets/icons/lastfm.svg?raw'
import { useT } from '@/i18n'

const { t } = useT()

export default <SettingCategory>{
    title: t("Common.Plugins"),
    show_if: loggedInUserIsAdmin,
    groups: [
        {
            title: t("Common.Lyrics"),
            icon: LyricsSvg,
            desc: t("Settings.Plugins.LyricsDescription"),
            settings: lyrics,
            experimental: true,
        },
        {
            title: t("Settings.Plugins.LastFM.Title"),
            icon: LastfmSvg,
            desc: t('Settings.Plugins.LastFM.Description'),
            settings: lastfm,
        },
        {
            title: 'Subsonic API',
            icon: LastfmSvg,
            desc: 'Enable Subsonic/OpenSubsonic API access for third-party clients',
            settings: subsonic,
        },
    ],
}
