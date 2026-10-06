import audio from './audio'
import about from './about'
import { general, library } from './general'
import plugins from './plugins'
import profile from './accounts/profile'
import accounts from './accounts'
import pairing from './accounts/pairing'
import devices from './devices'

import DevicesSvg from '@/assets/icons/laptop.svg?raw'

const devicesCategory = {
    title: 'Devices',
    groups: [
        {
            title: 'Connected devices',
            icon: DevicesSvg,
            desc: 'Apps signed in to your account',
            settings: devices,
        },
    ],
}

export default [general, profile, pairing, accounts, library, audio, plugins, devicesCategory, about]
