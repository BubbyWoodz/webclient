import { Setting } from '@/interfaces/settings'
import { SettingType } from '../enums'

const devicesList = <Setting>{
    title: 'Connected devices',
    desc: 'See every app signed in to your account, hand playback to another device, or disconnect one remotely.',
    type: SettingType.devices,
    action: () => {},
}

export default [devicesList]
