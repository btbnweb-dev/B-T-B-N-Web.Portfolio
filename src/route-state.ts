import { createContext, useContext } from 'react'
export const RouterContext = createContext({ path: '/', navigate: (_path: string) => {} })
export const useRoute = () => useContext(RouterContext)
