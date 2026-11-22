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
    if (row.state === 'confirmed' || row.edition === item.edition) return '此座已由另一旅客暂留或确认'
  }
  return ''
}
