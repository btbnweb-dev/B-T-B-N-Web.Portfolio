import { createContext, useContext } from 'react'
import type { Project } from './data'

export type ProjectsState = { projects: Project[]; loading: boolean; error: string | null }

export const ProjectsContext = createContext<ProjectsState>({ projects: [], loading: true, error: null })
export const useProjects = () => useContext(ProjectsContext)
