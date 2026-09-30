import { describe, expect, it } from 'vitest'
import { estrategias, listaEstrategias } from '../algorithms'
import archivoConfig from './config.json'
import {
  aJson,
  configDelProyecto,
  configPorDefecto,
  estrategiasVisibles,
  leerConfig,
  mismaConfig,
  normalizar,
  permiteDirigido,
} from './configuracion'

const todas = listaEstrategias

describe('configuración', () => {
  it('por defecto muestra todo', () => {
    const c = configPorDefecto(todas)
    expect(c.estrategias).toEqual(['prim', 'kruskal', 'dijkstra'])
    expect(permiteDirigido(c, todas)).toBe(true)
  })

  it('oculta la opción dirigido si solo quedan algoritmos de árbol mínimo', () => {
    const c = { ...configPorDefecto(todas), estrategias: ['prim', 'kruskal'] }
    expect(permiteDirigido(c, todas)).toBe(false)
    expect(estrategiasVisibles(c, todas)).toEqual([estrategias.prim, estrategias.kruskal])
  })

  it('normaliza datos guardados inválidos o viejos', () => {
    expect(normalizar(null, todas)).toEqual(configPorDefecto(todas))
    const c = normalizar({ estrategias: ['dijkstra', 'borrado', 3], aleatorio: false, leyenda: 'no' }, todas)
    expect(c.estrategias).toEqual(['dijkstra'])
    expect(c.aleatorio).toBe(false)
    expect(c.leyenda).toBe(true)
  })

  it('config.json del proyecto es válido y está normalizado', () => {
    const proyecto = configDelProyecto(todas)
    expect(normalizar(archivoConfig, todas)).toEqual(proyecto)
    expect(aJson(proyecto)).toBe(JSON.stringify(JSON.parse(aJson(proyecto)), null, 2) + '\n')
    for (const clave of Object.keys(archivoConfig)) expect(proyecto).toHaveProperty(clave)
  })

  it('sin localStorage (o sin cambios locales) se usa la configuración del proyecto', () => {
    expect(leerConfig(todas)).toEqual(configDelProyecto(todas))
  })

  it('una config local incompleta se completa con la del proyecto, no con los valores fijos', () => {
    const proyecto = { ...configPorDefecto(todas), aleatorio: false }
    const local = normalizar({ integrantes: false }, todas, proyecto)
    expect(local.aleatorio).toBe(false)
    expect(local.integrantes).toBe(false)
  })

  it('aJson genera un JSON que vuelve a leerse igual', () => {
    const c = { ...configPorDefecto(todas), estrategias: ['dijkstra'], leyenda: false }
    expect(normalizar(JSON.parse(aJson(c)), todas)).toEqual(c)
    expect(mismaConfig(c, { ...c })).toBe(true)
  })

  it('nunca deja la lista de estrategias vacía', () => {
    expect(normalizar({ estrategias: [] }, todas).estrategias).toEqual(['prim', 'kruskal', 'dijkstra'])
  })
})
