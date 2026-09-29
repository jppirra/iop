import { describe, expect, it } from 'vitest'
import { estrategias, listaEstrategias } from '../algorithms'
import { configPorDefecto, estrategiasVisibles, normalizar, permiteDirigido } from './configuracion'

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

  it('nunca deja la lista de estrategias vacía', () => {
    expect(normalizar({ estrategias: [] }, todas).estrategias).toEqual(['prim', 'kruskal', 'dijkstra'])
  })
})
