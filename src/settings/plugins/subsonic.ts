import useSettings from '@/stores/settings'
import { Setting } from '@/interfaces/settings'
import { SettingType } from '../enums'
import { useT } from '@/i18n'

const { t } = useT()

const enable = <Setting>{
    title: 'Enable Subsonic API',
    desc: 'Allow Subsonic/OpenSubsonic clients to connect to this server via /rest/',
    type: SettingType.binary,
    action: () => {
        const settings = useSettings()
        return settings.toggleSubsonic()
    },
    is_active: () => {
        const settings = useSettings()
        return settings.subsonicEnabled
    },
}

const apiKeyInfo = <Setting>{
    title: 'API Key',
    desc: 'Generate a per-user API key for Subsonic clients (OpenSubsonic auth). Use your key as the password with any username.',
    type: SettingType.button,
    action: () => {
        const settings = useSettings()
        return settings.generateSubsonicApiKey()
    },
    button_text: () => {
        const settings = useSettings()
        return settings.subsonicApiKey ? 'Regenerate Key' : 'Generate Key'
    },
}

export default [enable, apiKeyInfo]
