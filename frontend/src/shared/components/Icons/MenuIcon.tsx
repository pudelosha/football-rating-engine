import type { MenuIconName } from '../../types'

const paths: Record<MenuIconName, string[]> = {
  home: ['M4 11.2 12 4l8 7.2', 'M6.8 10.2V20h10.4v-9.8', 'M10 20v-5h4v5'],
  dashboard: ['M4 13h7V4H4Z', 'M13 20h7V4h-7Z', 'M4 20h7v-5H4Z'],
  ratings: ['M5 19V9', 'M12 19V5', 'M19 19v-7', 'M4 19h16'],
  teams: ['M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M3.8 19a4.2 4.2 0 0 1 8.4 0', 'M11.8 19a4.2 4.2 0 0 1 8.4 0'],
  matches: ['M7 3v4', 'M17 3v4', 'M4 8h16', 'M5 5h14v15H5Z', 'M8 12h3', 'M13 12h3', 'M8 16h3'],
  api: ['M8 8l-4 4 4 4', 'M16 8l4 4-4 4', 'M14 5l-4 14'],
  tournaments: ['M7 4h10v3a5 5 0 0 1-10 0Z', 'M9 19h6', 'M12 12v7', 'M5 5H3v2a3 3 0 0 0 4 2.8', 'M19 5h2v2a3 3 0 0 1-4 2.8'],
  predictions: ['M4 17c4-8 12-8 16 0', 'M8 17c2.7-4.4 5.3-4.4 8 0', 'M12 17v-4', 'M12 4v3', 'M18 6l-2 2', 'M6 6l2 2'],
  betting: ['M5 6h14v12H5Z', 'M8 9h8', 'M8 13h3', 'M14 13h2', 'M8 16h2', 'M13 16h3'],
  admin: ['M12 3l7 3v5c0 4.5-2.8 7.6-7 9-4.2-1.4-7-4.5-7-9V6Z', 'M9.5 12.2l1.7 1.7 3.4-4'],
  profile: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
  logout: ['M10 5H5v14h5', 'M14 8l4 4-4 4', 'M8 12h10'],
  'arrow-left': ['M19 12H5', 'M12 5l-7 7 7 7'],
  search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'M16 16l5 5'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 14h10l1-14', 'M9 7V4h6v3'],
}

export function MenuIcon({ name }: { name: MenuIconName }) {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  )
}
