export function cabinRequest(streams, changes, item) {
  if (!streams.travelers.some(t => t[0] === item.scope && t[1] === item.ref)) {
    return '未找到该航段和订位人'
  }
  const chosen = streams.seats.find(r => r[0] === item.scope && r[2] === item.value)
  if (!chosen || chosen[5] !== '1') return '座位不可办理'
  const frozenOccupant = streams.draft.find(r =>
    r[0] === item.scope && r[5] === 'confirmed' && r[3] === item.value && r[2] !== item.ref
  )
  if (frozenOccupant) return '此座已由另一旅客确认'
  for (const row of changes.values()) {
    if (row.scope !== item.scope || row.ref === item.ref || row.value !== item.value) continue
    const actual = presentSeatReceipt(row, streams)
    if (['confirmed','draft','reviewed'].includes(actual.state)) return '此座已由另一旅客暂留或确认'
  }
  return ''
}

export function presentSeatReceipt(row, streams) {
  if (row.state === 'confirmed' || row.state === 'released') return row
  const currentMap = streams.seats.find(seat => seat[0] === row.scope)?.[1]
  if (currentMap !== row.model || Number(streams.clock[0][0]) >= row.expires) {
    return { ...row, state: 'expired' }
  }
  return row
}

export function holdingTerms(item, streams) {
  const model = streams.seats.find(seat => seat[0] === item.scope)[1]
  const lifetime = Number(streams.policy.find(row => row[0] === item.scope)[1])
  return { model, expires: Number(streams.clock[0][0]) + lifetime }
}
